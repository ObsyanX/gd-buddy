import { useNavigate } from "react-router-dom";
import TopicSelection from "@/components/TopicSelection";

const Practice = () => {
  const navigate = useNavigate();

  const handleTopicSelected = (topic: any) => {
    navigate('/practice/setup', { state: { topic } });
  };

  const handleBack = () => {
    navigate('/');
  };

  return (
    <TopicSelection 
      onTopicSelected={handleTopicSelected} 
      onBack={handleBack} 
    />
  );
};

export default Practice;
