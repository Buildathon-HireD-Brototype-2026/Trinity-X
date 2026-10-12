import React from 'react';
import Navbar from './Navbar';

export default function AdminShell() {
  return (
    <div className="admin-shell">
      <Navbar />
      <main className="admin-main-canvas">
        {/* Intentionally left clean per user requirements: only the top bar is displayed */}
      </main>
    </div>
  );
}
