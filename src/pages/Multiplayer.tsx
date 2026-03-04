import { useNavigate } from "react-router-dom";
import MultiplayerLobby from "@/components/MultiplayerLobby";

const Multiplayer = () => {
  const navigate = useNavigate();

  const handleSessionJoined = (sessionId: string) => {
    navigate(`/home/session/${sessionId}`);
  };

  const handleBack = () => {
    navigate('/home');
  };

  const handleCreateRoom = () => {
    navigate('/home/multiplayer/topic');
  };

  return (
    <MultiplayerLobby 
      onSessionJoined={handleSessionJoined} 
      onBack={handleBack}
      onCreateRoom={handleCreateRoom}
    />
  );
};

export default Multiplayer;
