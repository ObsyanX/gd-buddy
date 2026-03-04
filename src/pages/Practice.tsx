import { useNavigate } from "react-router-dom";
import TopicSelection from "@/components/TopicSelection";

const Practice = () => {
  const navigate = useNavigate();

  const handleTopicSelected = (topic: any) => {
    navigate('/home/practice/setup', { state: { topic } });
  };

  const handleBack = () => {
    navigate('/home');
  };

  return (
    <TopicSelection 
      onTopicSelected={handleTopicSelected} 
      onBack={handleBack} 
    />
  );
};

export default Practice;
