import { auth, googleProvider } from '../services/firebase';
import { signInWithPopup } from 'firebase/auth';

export default function Login() {
  const loginWithGoogle = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error("Erreur de connexion :", error);
      alert("Impossible de se connecter. Vérifie ta config Firebase !");
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-jungle-cream p-6">
      <div className="text-6xl mb-6">🌿</div>
      <h1 className="text-3xl font-serif text-jungle-green font-bold mb-2">Ma Jungle</h1>
      <p className="text-gray-600 mb-8 text-center italic">Le carnet de bord de nos plantes préférées.</p>
      
      <button
        onClick={loginWithGoogle}
        className="flex items-center gap-3 bg-white border border-gray-300 px-6 py-3 rounded-full shadow-sm hover:shadow-md transition-all font-medium text-gray-700"
      >
        <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-5 h-5" alt="Google" />
        Se connecter avec Google
      </button>
    </div>
  );
}