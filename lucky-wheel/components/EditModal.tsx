import React, { useState, useEffect } from 'react';

// Extend Window interface for Google APIs
declare global {
    interface Window {
        gapi: any;
        google: any;
    }
}

interface EditModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (newText: string) => void;
    currentStudents: string[];
    onClear?: () => void;  // Optional: function to clear all saved data
}

// Icon for Google Sheets
const GoogleSheetsIcon = () => (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none">
        <path d="M14 2H6C4.9 2 4 2.9 4 4V20C4 21.1 4.9 22 6 22H18C19.1 22 20 21.1 20 20V8L14 2Z" fill="#0F9D58" />
        <path d="M14 2V8H20L14 2Z" fill="#87CEAC" />
        <path d="M8 12H16V14H8V12ZM8 16H14V18H8V16Z" fill="white" />
    </svg>
);

export const EditModal: React.FC<EditModalProps> = ({ isOpen, onClose, onSave, currentStudents, onClear }) => {
    const [editText, setEditText] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [importError, setImportError] = useState("");
    const [selectedColumn, setSelectedColumn] = useState(0); // 0 = Cột A, 1 = Cột B, 2 = Cột C

    // --- Google Picker Integration ---
    const CLIENT_ID = '270974453484-vpsgvnih68hcmuhm8nn358pok8335e4a.apps.googleusercontent.com';
    const API_KEY = 'AIzaSyC0TqnPxCDWc8HutyBJKL_rbmAF_Ar8QKY'; // From DUAN3 project

    const [isGapiLoaded, setIsGapiLoaded] = useState(false);
    const [isGsiLoaded, setIsGsiLoaded] = useState(false);
    const [tokenClient, setTokenClient] = useState<any>(null);

    useEffect(() => {
        if (isOpen) {
            setEditText(currentStudents.join('\n'));
            setImportError("");
        }
    }, [isOpen, currentStudents]);

    const loadScript = (src: string, onLoad: () => void) => {
        const script = document.createElement('script');
        script.src = src;
        script.async = true;
        script.defer = true;
        script.onload = onLoad;
        document.body.appendChild(script);
    };

    useEffect(() => {
        // Load GAPI (Google API Client)
        loadScript('https://apis.google.com/js/api.js', () => {
            window.gapi.load('picker', () => {
                setIsGapiLoaded(true);
            });
        });

        // Load GSI (Google Identity Services)
        loadScript('https://accounts.google.com/gsi/client', () => {
            setIsGsiLoaded(true);
        });
    }, []);

    // Initialize Token Client when GSI is loaded
    useEffect(() => {
        if (isGsiLoaded && window.google && window.google.accounts) {
            const client = window.google.accounts.oauth2.initTokenClient({
                client_id: CLIENT_ID,
                scope: 'https://www.googleapis.com/auth/drive.readonly',
                callback: '', // Defined at request time
            });
            setTokenClient(client);
        }
    }, [isGsiLoaded]);

    const processCsvData = (csvText: string) => {
        const lines = csvText.split('\n');
        const names: string[] = [];

        for (const line of lines) {
            // CSV parsing - get selected column
            const cells = line.split(',');
            const selectedCell = cells[selectedColumn]?.trim().replace(/"/g, '');

            if (selectedCell && selectedCell !== '') {
                names.push(selectedCell);
            }
        }

        if (names.length === 0) {
            throw new Error("Không tìm thấy dữ liệu trong cột được chọn!");
        }

        setEditText(names.join('\n'));
        setImportError("");
    };

    const handleGooglePicker = () => {
        if (!tokenClient || !isGapiLoaded) {
            setImportError("Google Service chưa sẵn sàng, vui lòng đợi thêm chút...");
            return;
        }

        setIsLoading(true);

        // 1. Request Access Token
        tokenClient.callback = async (response: any) => {
            if (response.error !== undefined) {
                console.error("Auth error:", response);
                setIsLoading(false);
                setImportError("Lỗi xác thực Google: " + response.error);
                return;
            }

            const accessToken = response.access_token;
            createPicker(accessToken);
        };

        // Always prompt for consent to ensure we get a fresh token accessible by Picker
        // Or specific logic: if (gapi.client.getToken() === null) ...
        // For simplicity and robustness with GSI, prompt='' usually tries silent, prompt='consent' forces.
        tokenClient.requestAccessToken({ prompt: '' });
    };

    const createPicker = (accessToken: string) => {
        if (!isGapiLoaded) {
            setIsLoading(false);
            return;
        }

        const view = new window.google.picker.View(window.google.picker.ViewId.SPREADSHEETS);
        view.setMimeTypes("application/vnd.google-apps.spreadsheet");

        const pickerBuilder = new window.google.picker.PickerBuilder()
            .enableFeature(window.google.picker.Feature.NAV_HIDDEN)
            .enableFeature(window.google.picker.Feature.MULTISELECT_ENABLED)
            .setDeveloperKey(API_KEY)
            .setAppId(CLIENT_ID.split('-')[0])
            .setOAuthToken(accessToken)
            .addView(view)
            .addView(new window.google.picker.DocsUploadView())
            .setCallback((data: any) => pickerCallback(data, accessToken));

        const picker = pickerBuilder.build();
        picker.setVisible(true);
    };

    const pickerCallback = async (data: any, accessToken: string) => {
        if (data.action === window.google.picker.Action.PICKED) {
            const fileId = data.docs[0].id;

            // Fetch file content using the access token
            try {
                const response = await fetch(`https://docs.google.com/spreadsheets/d/${fileId}/export?format=csv`, {
                    headers: {
                        Authorization: `Bearer ${accessToken}`
                    }
                });

                if (!response.ok) {
                    throw new Error("Không thể tải nội dung file.");
                }

                const csvText = await response.text();
                processCsvData(csvText);
            } catch (error: any) {
                console.error("Error fetching sheet:", error);
                setImportError("Lỗi khi đọc file: " + (error.message || "Không xác định"));
            } finally {
                setIsLoading(false);
            }
        } else if (data.action === window.google.picker.Action.CANCEL) {
            setIsLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 backdrop-blur-sm animate-[fade-in_0.3s_ease-out_forwards]">
            <div className="bg-gradient-to-br from-pink-100 to-white p-6 rounded-3xl shadow-2xl w-full max-w-md mx-4 border-4 border-pink-200">
                <h2 className="text-2xl font-bungee text-pink-500 text-center mb-4 tracking-wider">Chỉnh Sửa Danh Sách</h2>

                {/* Hướng dẫn đăng nhập Google */}
                <div className="mb-3 p-3 bg-amber-50 rounded-xl border border-amber-200">
                    <div className="flex items-start gap-2">
                        <span className="text-amber-500 text-lg">💡</span>
                        <div className="text-xs text-amber-700">
                            <p className="font-bold mb-1">Lưu ý khi đăng nhập Google:</p>
                            <p>Nếu thấy cảnh báo <strong>"Google chưa xác minh ứng dụng này"</strong>, hãy nhấn <strong>"Nâng cao"</strong> → <strong>"Truy cập giaoviencn.io.vn"</strong> để tiếp tục.</p>
                        </div>
                    </div>
                </div>

                {/* Column Selector */}
                <div className="mb-3">
                    <label className="block text-sm font-bold text-pink-500 mb-2">Chọn cột dữ liệu từ bảng tính:</label>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setSelectedColumn(0)}
                            className={`flex-1 py-2 px-3 rounded-xl font-bold text-sm transition-all ${selectedColumn === 0
                                ? 'bg-gradient-to-r from-pink-500 to-rose-500 text-white shadow-lg'
                                : 'bg-pink-100 text-pink-600 hover:bg-pink-200'
                                }`}
                        >
                            Cột A (Dòng 1)
                        </button>
                        <button
                            onClick={() => setSelectedColumn(1)}
                            className={`flex-1 py-2 px-3 rounded-xl font-bold text-sm transition-all ${selectedColumn === 1
                                ? 'bg-gradient-to-r from-pink-500 to-rose-500 text-white shadow-lg'
                                : 'bg-pink-100 text-pink-600 hover:bg-pink-200'
                                }`}
                        >
                            Cột B (Dòng 2)
                        </button>
                        <button
                            onClick={() => setSelectedColumn(2)}
                            className={`flex-1 py-2 px-3 rounded-xl font-bold text-sm transition-all ${selectedColumn === 2
                                ? 'bg-gradient-to-r from-pink-500 to-rose-500 text-white shadow-lg'
                                : 'bg-pink-100 text-pink-600 hover:bg-pink-200'
                                }`}
                        >
                            Cột C (Dòng 3)
                        </button>
                    </div>
                </div>

                {/* Google Sheets Import Button */}
                <button
                    onClick={handleGooglePicker}
                    disabled={isLoading || !isGapiLoaded}
                    className="w-full mb-4 flex items-center justify-center gap-2 py-2.5 px-4 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-400 hover:to-emerald-500 text-white font-bold rounded-xl shadow-lg transition-all transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {isLoading ? (
                        <>
                            <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                            </svg>
                            Đang xử lý...
                        </>
                    ) : (
                        <>
                            <GoogleSheetsIcon />
                            Chọn từ Drive
                        </>
                    )}
                </button>

                {importError && (
                    <div className="mb-4 p-3 bg-red-50 rounded-lg border border-red-200 text-red-600 text-sm text-center">
                        {importError}
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
                <div className="flex justify-between gap-3 mt-6">
                    {/* Delete button - left side */}
                    {onClear && (
                        <button
                            onClick={onClear}
                            className="font-bungee text-sm md:text-base bg-red-500 hover:bg-red-600 text-white py-2 px-4 rounded-full shadow-md transform active:scale-95 transition-all flex items-center gap-1"
                            title="Xóa toàn bộ danh sách đã lưu"
                        >
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" />
                            </svg>
                            Xóa
                        </button>
                    )}

                    {/* Spacer if no delete button */}
                    {!onClear && <div></div>}

                    {/* Cancel and Save buttons - right side */}
                    <div className="flex gap-3">
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
        </div>
    );
};