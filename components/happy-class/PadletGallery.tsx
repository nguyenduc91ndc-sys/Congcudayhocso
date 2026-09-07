import { useEffect, useRef, useState } from 'react';
import './padlet-gallery.css';

// Extract only the iframe URL; never insert pasted HTML into the application.
export function parsePadletEmbed(input: unknown): string | null {
  if (typeof input !== 'string' || !input.trim() || input.length > 20000) return null;
  try {
    let source = input.trim();
    if (source.startsWith('<')) {
      source = new DOMParser().parseFromString(source, 'text/html').querySelector('iframe')?.getAttribute('src') || '';
    }
    if (source.startsWith('//')) source = `https:${source}`;
    const url = new URL(source);
    const host = url.hostname;
    if (url.protocol !== 'https:' || url.username || url.password || url.port
      || !(host === 'padlet.com' || host.endsWith('.padlet.com') || host === 'padlet.org' || host.endsWith('.padlet.org'))) return null;
    if (!/^\/embed\/[\w-]+\/?$/.test(url.pathname)
      && !/^\/padlets\/[\w-]+\/embeds\/(?:preview_embed|slideshow|board)\/?$/.test(url.pathname)) return null;
    return url.href;
  } catch { return null; }
}

export function PadletGallery({ url, canEdit, onSave }: { url: string; canEdit: boolean; onSave: (url: string) => void }) {
  const [draft, setDraft] = useState(url);
  const [editing, setEditing] = useState(!url);
  const [message, setMessage] = useState('');
  const frame = useRef<HTMLDivElement>(null);
  const safeUrl = parsePadletEmbed(url);
  useEffect(() => { setDraft(url); setEditing(!url); }, [url]);
  return <section className="padlet-gallery">
    <header><div><h2>Trưng bày sản phẩm</h2><p>Góc chia sẻ bài làm, hình ảnh và ý tưởng của lớp trên Padlet.</p></div>
      {canEdit && !editing && <button onClick={() => { setDraft(url); setEditing(true); setMessage(''); }}>Thay Padlet</button>}
    </header>
    {canEdit && editing && <form onSubmit={(event) => {
      event.preventDefault();
      const next = parsePadletEmbed(draft);
      if (!next) { setMessage('Hãy dán mã nhúng Padlet hoặc đường dẫn https://padlet.com/embed/… từ mục Chia sẻ.'); return; }
      onSave(next); setEditing(false); setMessage('Đã cập nhật khung Padlet.');
    }}>
      <label htmlFor="padlet-source">Mã nhúng hoặc đường dẫn nhúng Padlet</label>
      <p>Trong Padlet, chọn <strong>Share (Chia sẻ) → Embed in your blog or website → Copy board embed code</strong>, rồi dán vào đây.</p>
      <textarea id="padlet-source" value={draft} maxLength={20000} rows={3} placeholder="Dán mã iframe hoặc https://padlet.com/embed/…" onChange={(event) => setDraft(event.target.value)} />
      <div className="padlet-actions"><button type="submit">Lưu Padlet</button>
        {safeUrl && <><button type="button" onClick={() => { setEditing(false); setMessage(''); }}>Hủy</button><button type="button" onClick={() => { onSave(''); setDraft(''); setMessage('Đã gỡ khung nhúng khỏi lớp. Bảng trên Padlet vẫn được giữ.'); }}>Gỡ khung nhúng</button></>}
      </div>
    </form>}
    {message && <p role="status">{message}</p>}
    {safeUrl ? <div className="padlet-display" ref={frame}>
      <div className="padlet-actions"><a href={safeUrl} target="_blank" rel="noopener noreferrer">Mở Padlet ở tab mới ↗</a>
        <button onClick={async () => { try { if (document.fullscreenElement) await document.exitFullscreen(); else await frame.current?.requestFullscreen(); } catch { setMessage('Trình duyệt chưa hỗ trợ toàn màn hình. Bạn có thể mở Padlet ở tab mới.'); } }}>Bật / tắt toàn màn hình</button>
      </div>
      <iframe title="Padlet trưng bày sản phẩm của lớp" src={safeUrl} allow="camera; microphone; fullscreen" allowFullScreen />
      <p>Cần kết nối Internet. Nếu bảng không hiện, hãy mở ở tab mới và kiểm tra quyền chia sẻ trên Padlet.</p>
    </div> : <div className="padlet-empty"><span aria-hidden="true">🎨</span><h3>Góc sản phẩm đang chờ lớp mình!</h3><p>{canEdit ? 'Thêm Padlet phía trên để trưng bày sản phẩm ngay tại đây.' : 'Giáo viên chưa thêm Padlet cho lớp này.'}</p></div>}
  </section>;
}
