import { useNavigate, useParams } from "react-router-dom";
import { useEffect } from "react";
import DiscussionRoom from "@/components/DiscussionRoom";

const Session = () => {
  const navigate = useNavigate();
  const { sessionId } = useParams<{ sessionId: string }>();

  useEffect(() => {
    if (!sessionId) {
      navigate('/home/practice', { replace: true });
    }
  }, [sessionId, navigate]);

  if (!sessionId) {
    return null;
  }

  const handleComplete = () => {
    navigate(`/home/session/${sessionId}/report`);
  };

  return (
    <DiscussionRoom 
      sessionId={sessionId} 
      onComplete={handleComplete} 
    />
  );
};

export default Session;
