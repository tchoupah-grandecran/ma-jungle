import { auth, googleProvider, db } from '../services/firebase';
import { signInWithPopup } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { Sprout, Loader2 } from 'lucide-react';
import { useState } from 'react';

export default function Login() {
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const loginWithGoogle = async () => {
  setIsLoggingIn(true);
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const user = result.user;

    // Mise à jour ou création du profil utilisateur avec le familyId
    await setDoc(doc(db, "users", user.uid), {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName,
      photoURL: user.photoURL,
      // C'EST ICI QUE TU AJOUTES LE FAMILY_ID
      familyId: "NOTRE_JUNGLE_PARTAGEE", 
      lastLogin: new Date().toISOString()
    }, { merge: true }); // 'merge: true' est CRUCIAL pour ne pas écraser les autres données

  } catch (error) {
    console.error("Erreur de connexion :", error);
    setIsLoggingIn(false);
  }
};

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-jungle-green p-8 relative overflow-hidden">
      
      {/* Background subtil */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.05),transparent)] pointer-events-none" />

      <div className="relative z-10 flex flex-col items-center text-center">
        
        {/* L'icône Sprout qui se dessine */}
        <div className="mb-12">
          <Sprout 
            size={100} 
            className="text-jungle-cream animate-draw" 
            strokeWidth={1.5} 
          />
        </div>

        <h1 className="text-5xl font-rounded font-black text-jungle-cream mb-4 tracking-tight">
          Ma Jungle
        </h1>
        <p className="text-jungle-sage/70 text-lg font-medium italic max-w-[240px] leading-relaxed mb-16">
          Cultivez votre collection, un arrosage à la fois.
        </p>
        
        <button
          onClick={loginWithGoogle}
          disabled={isLoggingIn}
          className="group flex items-center gap-4 bg-jungle-cream px-10 py-5 rounded-[2.5rem] shadow-2xl hover:scale-105 active:scale-95 transition-all duration-300 disabled:opacity-50"
        >
          {isLoggingIn ? (
            <Loader2 className="animate-spin text-jungle-green" />
          ) : (
            <img 
              src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" 
              className="w-5 h-5 group-hover:rotate-12 transition-transform" 
              alt="Google" 
            />
          )}
          <span className="font-black text-jungle-green uppercase tracking-[0.15em] text-xs">
            {isLoggingIn ? 'Connexion...' : 'Entrer dans la jungle'}
          </span>
        </button>

      </div>
    </div>
  );
}