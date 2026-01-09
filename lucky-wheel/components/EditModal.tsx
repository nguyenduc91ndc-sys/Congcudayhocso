import React, { useState, useEffect } from 'react';

interface EditModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (newText: string) => void;
    currentStudents: string[];
}

// Icon for Google Sheets
const GoogleSheetsIcon = () => (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none">
        <path d="M14 2H6C4.9 2 4 2.9 4 4V20C4 21.1 4.9 22 6 22H18C19.1 22 20 21.1 20 20V8L14 2Z" fill="#0F9D58" />
        <path d="M14 2V8H20L14 2Z" fill="#87CEAC" />
        <path d="M8 12H16V14H8V12ZM8 16H14V18H8V16Z" fill="white" />
    </svg>
);

export const EditModal: React.FC<EditModalProps> = ({ isOpen, onClose, onSave, currentStudents }) => {
    const [editText, setEditText] = useState("");
    const [showGoogleImport, setShowGoogleImport] = useState(false);
    const [sheetUrl, setSheetUrl] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [importError, setImportError] = useState("");

    useEffect(() => {
        if (isOpen) {
            setEditText(currentStudents.join('\n'));
            setShowGoogleImport(false);
            setSheetUrl("");
            setImportError("");
        }
    }, [isOpen, currentStudents]);

    // Extract sheet ID from URL
    const extractSheetId = (url: string): string | null => {
        const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
        return match ? match[1] : null;
    };

    // Import from Google Sheets (public sheet via CSV export)
    const handleImportFromGoogle = async () => {
        if (!sheetUrl.trim()) {
            setImportError("Vui lòng nhập URL Google Sheet!");
            return;
        }

        const sheetId = extractSheetId(sheetUrl);
        if (!sheetId) {
            setImportError("URL không hợp lệ! Hãy nhập link Google Sheets.");
            return;
        }

        setIsLoading(true);
        setImportError("");

        try {
            // Export as CSV from first sheet (gid=0)
            const csvUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=0`;

            const response = await fetch(csvUrl);
            if (!response.ok) {
                throw new Error("Không thể truy cập bảng tính. Hãy đảm bảo bảng tính được chia sẻ công khai!");
            }

            const csvText = await response.text();

            // Parse CSV - get first column as names
            const lines = csvText.split('\n');
            const names: string[] = [];

            for (const line of lines) {
                // Simple CSV parsing - get first cell
                const cells = line.split(',');
                const firstCell = cells[0]?.trim().replace(/"/g, '');

                if (firstCell && firstCell !== '') {
                    names.push(firstCell);
                }
            }

            if (names.length === 0) {
                throw new Error("Không tìm thấy dữ liệu trong bảng tính!");
            }

            // Update the text area with imported names
            setEditText(names.join('\n'));
            setShowGoogleImport(false);
            setSheetUrl("");
            setImportError("");

        } catch (error: any) {
            console.error("Import error:", error);
            setImportError(error.message || "Lỗi khi import. Hãy thử lại!");
        } finally {
            setIsLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 backdrop-blur-sm animate-[fade-in_0.3s_ease-out_forwards]">
            <div className="bg-gradient-to-br from-pink-100 to-white p-6 rounded-3xl shadow-2xl w-full max-w-md mx-4 border-4 border-pink-200">
                <h2 className="text-2xl font-bungee text-pink-500 text-center mb-4 tracking-wider">Chỉnh Sửa Danh Sách</h2>

                {/* Google Sheets Import Button */}
                <button
                    onClick={() => setShowGoogleImport(!showGoogleImport)}
                    className="w-full mb-4 flex items-center justify-center gap-2 py-2.5 px-4 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-400 hover:to-emerald-500 text-white font-bold rounded-xl shadow-lg transition-all transform hover:scale-[1.02]"
                >
                    <GoogleSheetsIcon />
                    Nhập bảng tính Google
                </button>

                {/* Google Import Panel */}
                {showGoogleImport && (
                    <div className="mb-4 p-4 bg-green-50 rounded-xl border-2 border-green-200">
                        <p className="text-sm text-green-700 mb-2 font-semibold">
                            📋 Dán link Google Sheet của bạn (cột đầu tiên sẽ được lấy)
                        </p>
                        <p className="text-xs text-green-600 mb-3">
                            ⚠️ Sheet phải được chia sẻ "Bất kỳ ai có liên kết đều xem được"
                        </p>
                        <input
                            type="text"
                            value={sheetUrl}
                            onChange={(e) => {
                                setSheetUrl(e.target.value);
                                setImportError("");
                            }}
                            placeholder="https://docs.google.com/spreadsheets/d/..."
                            className="w-full px-3 py-2 rounded-lg border-2 border-green-300 focus:border-green-500 focus:outline-none text-sm"
                        />
                        {importError && (
                            <p className="text-red-500 text-sm mt-2">❌ {importError}</p>
                        )}
                        <button
                            onClick={handleImportFromGoogle}
                            disabled={isLoading}
                            className="mt-3 w-full py-2 bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {isLoading ? (
                                <>
                                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                    </svg>
                                    Đang tải...
                                </>
                            ) : (
                                "✓ Import danh sách"
                            )}
                        </button>
                    </div>
                )}

                <p className="text-center text-pink-400 mb-4 text-sm font-roboto font-bold">Nhập tên mỗi học sinh trên một dòng.</p>
                <textarea
                    className="w-full h-64 p-4 rounded-xl bg-pink-50 text-pink-800 border-2 border-pink-200 focus:border-pink-400 focus:ring-4 focus:ring-pink-200/50 outline-none resize-none font-roboto shadow-inner placeholder-pink-300"
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    placeholder="Nguyễn Văn A&#10;Trần Thị B&#10;..."
                    spellCheck={false}
                />
                <div className="flex justify-end gap-3 mt-6">
                    <button
                        onClick={onClose}
                        className="font-bungee text-sm md:text-base bg-gray-400 hover:bg-gray-500 text-white py-2 px-6 rounded-full shadow-md transform active:scale-95 transition-all"
                    >
                        Hủy
                    </button>
                    <button
                        onClick={() => onSave(editText)}
                        className="font-bungee text-sm md:text-base bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-400 hover:to-rose-400 text-white py-2 px-8 rounded-full shadow-lg transform active:scale-95 transition-all ring-4 ring-pink-200"
                    >
                        Lưu Thay Đổi
                    </button>
                </div>
            </div>
        </div>
    );
};