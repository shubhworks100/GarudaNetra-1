import { useEffect } from 'react';
import { useLocation } from 'wouter';
import { GraduationCap } from 'lucide-react';

export default function SplashScreen() {
  const [, setLocation] = useLocation();

  useEffect(() => {
    const timer = setTimeout(() => {
      setLocation('/login');
    }, 3000);

    return () => clearTimeout(timer);
  }, [setLocation]);

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-blue-600 to-purple-700 flex items-center justify-center z-50">
      <div className="text-center text-white page-transition">
        {/* School logo placeholder */}
        <div className="w-24 h-24 mx-auto mb-6 bg-white rounded-full flex items-center justify-center">
          <GraduationCap className="h-12 w-12 text-blue-600" />
        </div>
        <h1 className="text-4xl font-bold mb-2">GarudaNetra</h1>
        <p className="text-xl mb-8">AI Attendance System</p>
        <div className="bg-white/20 rounded-lg p-4 mb-6">
          <p className="text-sm mb-2">Project by: Mridul, Kaushal, Samriddhi, Yogesh, Aryan</p>
          <p className="text-sm">Guided by: Mr. Mahesh Upadhyay (PGT Computer Science)</p>
        </div>
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
          <span className="ml-3">Loading...</span>
        </div>
      </div>
    </div>
  );
}
