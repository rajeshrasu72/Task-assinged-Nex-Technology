import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import {
  User,
  onAuthStateChanged,
  signInWithPopup,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  sendEmailVerification,
  updatePassword,
  signOut as firebaseSignOut,
  createUserWithEmailAndPassword,
  updateProfile,
} from 'firebase/auth';
import {
  doc,
  getDoc,
  onSnapshot,
  serverTimestamp,
  writeBatch,
  Unsubscribe,
} from 'firebase/firestore';
import {
  auth,
  db,
  googleProvider,
  OWNER_ADMIN_EMAIL,
  WORKSPACE_ID,
  withSecondaryAuth,
  OperationType,
  handleFirestoreError,
} from '../lib/firebase';
import { fetchPendingInviteForEmail, tsToIso } from '../lib/firestoreService';
import { UserProfile, UserRole } from '../types/models';

interface AuthContextValue {
  firebaseUser: User | null;
  profile: UserProfile | null;
  loading: boolean;
  authError: string | null;
  needsEmailVerification: boolean;
  isPendingApproval: boolean;
  isDisabled: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  sendResetEmail: (email: string) => Promise<void>;
  resendVerificationEmail: () => Promise<void>;
  changeOwnPassword: (newPassword: string) => Promise<void>;
  provisionEmployeeAuthAccount: (input: {
    email: string;
    displayName: string;
    tempPassword: string;
  }) => Promise<{ createdAuth: boolean; note: string }>;
  signOut: () => Promise<void>;
  clearAuthError: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function mapFirebaseAuthError(err: unknown): string {
  const code = (err as { code?: string })?.code || '';
  switch (code) {
    case 'auth/operation-not-allowed':
      return 'Email/Password sign-in is not enabled yet in Firebase Console (Authentication → Sign-in method). Please use Google Sign-In or enable Email/Password in Firebase Console.';
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return 'Invalid email address or password.';
    case 'auth/too-many-requests':
      return 'Too many sign-in attempts. Please wait a moment and try again.';
    case 'auth/popup-closed-by-user':
      return 'Sign-in window was closed before completing authentication.';
    case 'auth/weak-password':
      return 'Password must be at least 6 characters long.';
    case 'auth/requires-recent-login':
      return 'Please sign out and sign back in before changing your password.';
    default:
      return err instanceof Error ? err.message : 'Authentication failed.';
  }
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  const bootstrapOrLoadProfile = useCallback(async (user: User): Promise<void> => {
    const email = (user.email || '').toLowerCase();
    const isOwner = email === OWNER_ADMIN_EMAIL.toLowerCase() && user.emailVerified;
    const userRef = doc(db, 'users', user.uid);
    const roleRef = doc(db, 'roles', user.uid);

    try {
      const existingSnap = await getDoc(userRef);
      if (existingSnap.exists()) {
        // Ensure owner always has admin record if verified
        if (isOwner) {
          const adminRef = doc(db, 'admins', user.uid);
          const adminSnap = await getDoc(adminRef);
          if (!adminSnap.exists()) {
            const batch = writeBatch(db);
            batch.set(adminRef, {
              uid: user.uid,
              email,
              grantedBy: user.uid,
              createdAt: serverTimestamp(),
            });
            batch.set(roleRef, {
              uid: user.uid,
              role: 'admin',
              active: true,
              departmentId: existingSnap.data().departmentId || '',
              teamId: existingSnap.data().teamId || '',
              updatedBy: user.uid,
              updatedAt: serverTimestamp(),
            });
            batch.update(userRef, {
              role: 'admin',
              status: 'active',
              updatedAt: serverTimestamp(),
            });
            batch.update(doc(db, 'directory', user.uid), {
              role: 'admin',
              status: 'active',
              updatedAt: serverTimestamp(),
            });
            await batch.commit();
          }
        }
        return;
      }

      // First-time sign-in initialization
      const invite = email ? await fetchPendingInviteForEmail(email) : null;
      const batch = writeBatch(db);

      let assignedRole: UserRole = 'member';
      let active = false;
      let status: 'active' | 'pending' = 'pending';
      let departmentId = '';
      let teamId = '';
      let jobTitle = '';
      let displayName = user.displayName || email.split('@')[0] || 'Nex Employee';

      if (isOwner) {
        assignedRole = 'admin';
        active = true;
        status = 'active';
        jobTitle = 'Workspace Administrator';
        batch.set(doc(db, 'admins', user.uid), {
          uid: user.uid,
          email,
          grantedBy: user.uid,
          createdAt: serverTimestamp(),
        });
      } else if (invite && (invite.role === 'member' || invite.role === 'team_lead')) {
        assignedRole = invite.role;
        active = true;
        status = 'active';
        departmentId = invite.departmentId || '';
        teamId = invite.teamId || '';
        jobTitle = invite.jobTitle || '';
        displayName = invite.displayName || displayName;

        batch.update(doc(db, 'invites', invite.id), {
          status: 'claimed',
          updatedAt: serverTimestamp(),
        });
      }

      batch.set(roleRef, {
        uid: user.uid,
        role: assignedRole,
        active,
        departmentId,
        teamId,
        ...(invite && !isOwner ? { inviteId: invite.id } : {}),
        updatedBy: user.uid,
        updatedAt: serverTimestamp(),
      });

      batch.set(userRef, {
        uid: user.uid,
        email,
        displayName: displayName.slice(0, 120),
        jobTitle: jobTitle.slice(0, 120),
        phone: '',
        role: assignedRole,
        status,
        departmentId,
        teamId,
        avatarUrl: (user.photoURL || '').slice(0, 1000),
        workspaceId: WORKSPACE_ID,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      batch.set(doc(db, 'directory', user.uid), {
        uid: user.uid,
        displayName: displayName.slice(0, 120),
        jobTitle: jobTitle.slice(0, 120),
        role: assignedRole,
        status,
        departmentId,
        teamId,
        avatarUrl: (user.photoURL || '').slice(0, 1000),
        workspaceId: WORKSPACE_ID,
        updatedAt: serverTimestamp(),
      });

      await batch.commit();
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `users/${user.uid}`);
    }
  }, []);

  useEffect(() => {
    let profileUnsub: Unsubscribe | null = null;

    const authUnsub = onAuthStateChanged(auth, async (user) => {
      if (profileUnsub) {
        profileUnsub();
        profileUnsub = null;
      }

      setFirebaseUser(user);
      if (!user) {
        setProfile(null);
        setLoading(false);
        return;
      }

      if (!user.emailVerified) {
        setProfile(null);
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        await bootstrapOrLoadProfile(user);
        profileUnsub = onSnapshot(
          doc(db, 'users', user.uid),
          (snap) => {
            if (snap.exists()) {
              const d = snap.data();
              setProfile({
                ...(d as Omit<UserProfile, 'uid' | 'createdAt' | 'updatedAt'>),
                uid: d.uid || snap.id,
                createdAt: tsToIso(d.createdAt),
                updatedAt: tsToIso(d.updatedAt),
              });
            } else {
              setProfile(null);
            }
            setLoading(false);
          },
          (err) => {
            setAuthError(err.message);
            setLoading(false);
          }
        );
      } catch (err) {
        setAuthError(err instanceof Error ? err.message : 'Unable to initialize profile.');
        setLoading(false);
      }
    });

    return () => {
      authUnsub();
      if (profileUnsub) profileUnsub();
    };
  }, [bootstrapOrLoadProfile]);

  const signInWithGoogle = async () => {
    setAuthError(null);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      setAuthError(mapFirebaseAuthError(err));
      throw err;
    }
  };

  const signInWithEmail = async (email: string, password: string) => {
    setAuthError(null);
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
    } catch (err) {
      setAuthError(mapFirebaseAuthError(err));
      throw err;
    }
  };

  const sendResetEmail = async (email: string) => {
    setAuthError(null);
    try {
      await sendPasswordResetEmail(auth, email.trim());
    } catch (err) {
      setAuthError(mapFirebaseAuthError(err));
      throw err;
    }
  };

  const resendVerificationEmail = async () => {
    if (!auth.currentUser) return;
    setAuthError(null);
    try {
      await sendEmailVerification(auth.currentUser);
    } catch (err) {
      setAuthError(mapFirebaseAuthError(err));
      throw err;
    }
  };

  const changeOwnPassword = async (newPassword: string) => {
    if (!auth.currentUser) return;
    setAuthError(null);
    try {
      await updatePassword(auth.currentUser, newPassword);
    } catch (err) {
      setAuthError(mapFirebaseAuthError(err));
      throw err;
    }
  };

  const provisionEmployeeAuthAccount = async (input: {
    email: string;
    displayName: string;
    tempPassword: string;
  }): Promise<{ createdAuth: boolean; note: string }> => {
    try {
      await withSecondaryAuth(async (secAuth) => {
        const cred = await createUserWithEmailAndPassword(
          secAuth,
          input.email.trim().toLowerCase(),
          input.tempPassword
        );
        await updateProfile(cred.user, { displayName: input.displayName.trim() });
        await sendPasswordResetEmail(secAuth, input.email.trim().toLowerCase());
        await firebaseSignOut(secAuth);
      });
      return {
        createdAuth: true,
        note: 'Auth account created and password setup email dispatched.',
      };
    } catch (err) {
      const code = (err as { code?: string })?.code || '';
      if (code === 'auth/operation-not-allowed') {
        return {
          createdAuth: false,
          note: 'Invite saved. Employee can sign in with Google Sign-In immediately (Email/Password provider is disabled in Firebase Console).',
        };
      }
      if (code === 'auth/email-already-in-use') {
        return {
          createdAuth: false,
          note: 'Invite saved and linked to existing email account.',
        };
      }
      throw err;
    }
  };

  const signOut = async () => {
    setAuthError(null);
    await firebaseSignOut(auth);
  };

  const needsEmailVerification = Boolean(firebaseUser && !firebaseUser.emailVerified);
  const isPendingApproval = Boolean(profile && profile.status === 'pending');
  const isDisabled = Boolean(profile && profile.status === 'disabled');

  return (
    <AuthContext.Provider
      value={{
        firebaseUser,
        profile,
        loading,
        authError,
        needsEmailVerification,
        isPendingApproval,
        isDisabled,
        signInWithGoogle,
        signInWithEmail,
        sendResetEmail,
        resendVerificationEmail,
        changeOwnPassword,
        provisionEmployeeAuthAccount,
        signOut,
        clearAuthError: () => setAuthError(null),
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
