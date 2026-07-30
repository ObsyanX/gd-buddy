import { useNavigate, useLocation } from "react-router-dom";
import { useEffect } from "react";
import SessionSetup from "@/components/SessionSetup";
import { useStickyRouteValue } from "@/hooks/useStickyRouteValue";

const PracticeSetup = () => {
  const navigate = useNavigate();
  const location = useLocation();
  // Sticky: router state briefly reads as null while the next route loads.
  const topic = useStickyRouteValue(location.state?.topic);

  useEffect(() => {
    if (!topic) {
      navigate('/home/practice', { replace: true });
    }
  }, [topic, navigate]);

  if (!topic) {
    return null;
  }

  const handleSessionCreated = (sessionId: string) => {
    navigate(`/home/session/${sessionId}`);
  };

  const handleBack = () => {
    navigate('/home/practice');
  };

  return (
    <SessionSetup
      topic={topic}
      onSessionCreated={handleSessionCreated}
      onBack={handleBack}
    />
  );
};

export default PracticeSetup;
