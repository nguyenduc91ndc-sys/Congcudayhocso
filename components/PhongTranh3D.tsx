import React from 'react';

interface PhongTranh3DProps {
    user: { email: string; name: string } | null;
    onRequireLogin?: () => void;
}

export default function PhongTranh3D({ user, onRequireLogin }: PhongTranh3DProps) {
    if (!user && onRequireLogin) {
        onRequireLogin();
        return null; // Or return a login prompt here
    }

    return (
        <div style={{ width: '100%', height: '100%', minHeight: '100vh', overflow: 'hidden' }}>
            <iframe 
                src="/phong tranh 3D/virtual-gallery.html" 
                style={{ width: '100%', height: '100%', border: 'none', position: 'absolute', top: 0, left: 0 }}
                title="Phòng Tranh 3D"
                allowFullScreen
            />
        </div>
    );
}
