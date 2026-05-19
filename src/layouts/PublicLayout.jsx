import { Outlet } from 'react-router-dom';
import Navbar from '../components/Navbar/Navbar';
import Footer from '../components/Footer/Footer';
import WhatsAppFloat from '../components/WhatsAppFloat/WhatsAppFloat';
import './PublicLayout.css';

export default function PublicLayout() {
  return (
    <div className="public-layout">
      <Navbar />
      <main className="public-main">
        <Outlet />
      </main>
      <Footer />
      <WhatsAppFloat phoneNumber="6281234567890" />
    </div>
  );
}
