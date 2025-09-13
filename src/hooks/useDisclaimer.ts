import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/auth-context';

export function useDisclaimer() {
  const { user } = useAuth();
  const [showDisclaimer, setShowDisclaimer] = useState(false);

  useEffect(() => {
    if (user) {
      // Check if user has already accepted disclaimer in this session
      const disclaimerAccepted = sessionStorage.getItem(`disclaimer_accepted_${user.id}`);
      
      if (!disclaimerAccepted) {
        setShowDisclaimer(true);
      }
    }
  }, [user]);

  const acceptDisclaimer = () => {
    if (user) {
      // Store acceptance in session storage (resets each browser session)
      sessionStorage.setItem(`disclaimer_accepted_${user.id}`, 'true');
      setShowDisclaimer(false);
    }
  };

  return {
    showDisclaimer,
    acceptDisclaimer
  };
}