import { useNavigate } from 'react-router-dom';
import CanteenModal from './CanteenModal.jsx';

export default function CanteenPage() {
  const navigate = useNavigate();
  return (
    <>
      <h1>College Canteen</h1>
      <button className="btn-small" onClick={() => navigate('/')}>Back to Home</button>
      <CanteenModal onClose={() => navigate('/')} />
    </>
  );
}
