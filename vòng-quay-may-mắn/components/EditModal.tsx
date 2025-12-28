import React, { useState, useEffect } from 'react';

interface EditModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (newText: string) => void;
    currentStudents: string[];
}

export const EditModal: React.FC<EditModalProps> = ({ isOpen, onClose, onSave, currentStudents }) => {
    const [editText, setEditText] = useState("");

    useEffect(() => {
        if (isOpen) {
            setEditText(currentStudents.join('\n'));
        }
    }, [isOpen, currentStudents]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 backdrop-blur-sm animate-[fade-in_0.3s_ease-out_forwards]">
            <div className="bg-gradient-to-br from-pink-100 to-white p-6 rounded-3xl shadow-2xl w-full max-w-md mx-4 border-4 border-pink-200">
                <h2 className="text-2xl font-bungee text-pink-500 text-center mb-4 tracking-wider">Chỉnh Sửa Danh Sách</h2>
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