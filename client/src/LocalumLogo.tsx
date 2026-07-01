import logo from './assets/logo.png';

export default function LocalumLogo() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '36px', overflow: 'hidden', marginLeft: '-10px' }}>
      <img 
        src={logo} 
        alt="Localum Logo" 
        style={{ width: '180px', height: 'auto', objectFit: 'contain' }} 
      />
    </div>
  );
}
