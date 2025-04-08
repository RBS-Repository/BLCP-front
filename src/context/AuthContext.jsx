import { createContext, useContext, useEffect, useState } from 'react';
import { auth } from '../config/firebase';
import { onAuthStateChanged, signInWithEmailAndPassword } from 'firebase/auth';
import { getDoc, doc } from 'firebase/firestore';
import { db } from '../config/firebase';

const AuthContext = createContext();

// Add a special flag to track newly registered users
const REGISTRATION_MODE = 'registrationMode';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          // Force token refresh to get latest claims
          await firebaseUser.getIdToken(true);
          
          // Check if user is admin first
          const isAdmin = await checkAdmin(firebaseUser);
          
          // Check if this is a newly registered user in registration mode
          const isRegistrationMode = sessionStorage.getItem(REGISTRATION_MODE) === 'true';
          
          // Only check disabled status for non-admin users AND not in registration mode
          if (!isAdmin && !isRegistrationMode) {
            const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
            if (userDoc.exists() && userDoc.data().isActive === false) {
              await auth.signOut();
              setUser(null);
              setLoading(false);
              return;
            }
          }
          
          // Set the user with admin status
          setUser(Object.assign(firebaseUser, { admin: isAdmin }));
        } catch (error) {
          setUser(null);
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Enable registration mode
  const startRegistrationMode = () => {
    sessionStorage.setItem(REGISTRATION_MODE, 'true');
  };

  // End registration mode
  const endRegistrationMode = () => {
    sessionStorage.removeItem(REGISTRATION_MODE);
  };

  const login = async (email, password) => {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    setUser(userCredential.user);
  };

  const logout = async () => {
    await auth.signOut();
    setUser(null);
  };

  const checkAdmin = async (user) => {
    if (!user) return false;
    try {
      const token = await user.getIdTokenResult(true);
      return !!token.claims.admin;
    } catch (err) {
      return false;
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      loading, 
      login, 
      logout, 
      checkAdmin, 
      startRegistrationMode, 
      endRegistrationMode 
    }}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext); 