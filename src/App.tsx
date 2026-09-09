/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useState } from 'react';
import { onAuthStateChanged, signInWithPopup, GoogleAuthProvider, User } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from './lib/firebase';
import Dashboard from './components/Dashboard';
import { Dumbbell, LogIn } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [initializing, setInitializing] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setInitializing(true);
        // Ensure user document exists
        const userDocRef = doc(db, 'users', currentUser.uid);
        const userDoc = await getDoc(userDocRef);
        
        if (!userDoc.exists()) {
          await setDoc(userDocRef, {
            userId: currentUser.uid,
            email: currentUser.email,
            hevyApiKey: '',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          });
        }
        setUser(currentUser);
      } else {
        setUser(null);
      }
      setLoading(false);
      setInitializing(false);
    });

    return () => unsubscribe();
  }, []);

  const handleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Login Error:", error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-brand-bg text-brand-primary">
        <Dumbbell className="w-12 h-12 animate-bounce" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-brand-bg">
      <AnimatePresence mode="wait">
        {!user ? (
          <motion.div 
            key="login"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="flex flex-col items-center justify-center min-h-screen p-4 text-center"
          >
            <div className="mb-8 relative">
              <Dumbbell className="w-20 h-20 text-brand-primary" />
              <div className="absolute -bottom-2 -right-2 bg-brand-primary text-black text-[10px] px-2 py-0.5 rounded-full font-bold">PULSE</div>
            </div>
            <h1 className="text-4xl font-bold mb-4 tracking-tighter">HevyPulse</h1>
            <p className="text-gray-400 max-w-sm mb-8">
              Transform your Hevy workout data into high-performance insights. Premium analytics for elite training.
            </p>
            <button 
              onClick={handleLogin}
              className="btn-primary flex items-center gap-2 text-lg px-8 py-3"
            >
              <LogIn className="w-5 h-5" />
              Connect with Google
            </button>
          </motion.div>
        ) : (
          <motion.div 
            key="dashboard"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="w-full"
          >
            <Dashboard user={user} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

