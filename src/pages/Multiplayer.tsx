import { useNavigate } from "react-router-dom";
import MultiplayerLobby from "@/components/MultiplayerLobby";

const Multiplayer = () => {
  const navigate = useNavigate();

  const handleSessionJoined = (sessionId: string) => {
    navigate(`/session/${sessionId}`);
  };

  const handleBack = () => {
    navigate('/');
  };

  return (
    <MultiplayerLobby 
      onSessionJoined={handleSessionJoined} 
      onBack={handleBack} 
    />
  );
};

export default Multiplayer;
