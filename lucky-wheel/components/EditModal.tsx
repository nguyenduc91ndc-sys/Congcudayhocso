import React, { useState, useEffect } from 'react';
import { useGoogleLogin } from '@react-oauth/google';
import { firebaseConfig } from '../../utils/firebaseConfig';

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
    const [isLoading, setIsLoading] = useState(false);
    const [importError, setImportError] = useState("");
    const [isPickerApiLoaded, setIsPickerApiLoaded] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setEditText(currentStudents.join('\n'));
            setImportError("");
        }
    }, [isOpen, currentStudents]);

    // Load Google Picker API
    useEffect(() => {
        const loadPickerApi = () => {
            const script = document.createElement("script");
            script.src = "https://apis.google.com/js/api.js";
            script.onload = () => {
                window.gapi.load('picker', {
                    callback: () => {
                        setIsPickerApiLoaded(true);
                    }
                });
            };
            document.body.appendChild(script);
        };

        if (!window.gapi) {
            loadPickerApi();
        } else {
            window.gapi.load('picker', {
                callback: () => {
                    setIsPickerApiLoaded(true);
                }
            });
        }
    }, []);

    const processCsvData = (csvText: string) => {
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

        setEditText(names.join('\n'));
        setImportError("");
    };

    const handlePickerCallback = (data: any, accessToken: string) => {
        if (data.action === google.picker.Action.PICKED) {
            const fileId = data.docs[0].id;
            setIsLoading(true);

            // Fetch file content using the access token
            fetch(`https://docs.google.com/spreadsheets/d/${fileId}/export?format=csv`, {
                headers: {
                    Authorization: `Bearer ${accessToken}`
                }
            })
                .then(response => {
                    if (!response.ok) {
                        throw new Error("Không thể tải nội dung file.");
                    }
                    return response.text();
                })
                .then(csvText => {
                    processCsvData(csvText);
                })
                .catch(error => {
                    console.error("Error fetching sheet:", error);
                    setImportError("Lỗi khi đọc file. Hãy đảm bảo bạn có quyền truy cập.");
                })
                .finally(() => {
                    setIsLoading(false);
                });
        }
    };

    const login = useGoogleLogin({
        onSuccess: (codeResponse) => {
            if (isPickerApiLoaded && codeResponse.access_token) {
                const picker = new google.picker.PickerBuilder()
                    .addView(google.picker.ViewId.SPREADSHEETS)
                    .setOAuthToken(codeResponse.access_token)
                    .setDeveloperKey(firebaseConfig.apiKey)
                    .setCallback((data: any) => handlePickerCallback(data, codeResponse.access_token))
                    .build();
                picker.setVisible(true);
            } else {
                setImportError("Google Picker chưa sẵn sàng. Vui lòng thử lại.");
            }
        },
        onError: (error) => {
            console.error("Login Failed:", error);
            setImportError("Đăng nhập thất bại.");
        },
        scope: 'https://www.googleapis.com/auth/drive.readonly',
    });

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 backdrop-blur-sm animate-[fade-in_0.3s_ease-out_forwards]">
            <div className="bg-gradient-to-br from-pink-100 to-white p-6 rounded-3xl shadow-2xl w-full max-w-md mx-4 border-4 border-pink-200">
                <h2 className="text-2xl font-bungee text-pink-500 text-center mb-4 tracking-wider">Chỉnh Sửa Danh Sách</h2>

                {/* Google Sheets Import Button */}
                <button
                    onClick={() => login()}
                    disabled={isLoading || !isPickerApiLoaded}
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
                            Chọn từ Google Sheets
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