import React, { useState } from 'react';
import { Play, Upload, Plus, Trash2, HelpCircle, Download, Home as HomeIcon } from 'lucide-react';
import { Question } from '../types';
import { v4 as uuidv4 } from 'uuid';

interface SettingsProps {
  onStartGame: (questions: Question[]) => void;
  onBack: () => void;
}

export const Settings: React.FC<SettingsProps> = ({ onStartGame, onBack }) => {
  const [questions, setQuestions] = useState<Question[]>([
    {
      id: uuidv4(),
      text: 'Thủ đô của Việt Nam là gì?',
      options: ['Hà Nội', 'Hồ Chí Minh', 'Đà Nẵng', 'Hải Phòng'],
      correctAnswerIndex: 0,
    },
    {
      id: uuidv4(),
      text: 'Con vật nào gáy báo thức vào buổi sáng?',
      options: ['Chó', 'Mèo', 'Gà trống', 'Vịt'],
      correctAnswerIndex: 2,
    }
  ]);
  const [importText, setImportText] = useState('');
  const [showImport, setShowImport] = useState(false);

  const handleAddQuestion = () => {
    setQuestions([
      ...questions,
      {
        id: uuidv4(),
        text: '',
        options: ['', '', '', ''],
        correctAnswerIndex: 0,
      }
    ]);
  };

  const handleUpdateQuestion = (index: number, field: string, value: string | number, optionIndex?: number) => {
    const updated = [...questions];
    if (field === 'text') {
      updated[index].text = value as string;
    } else if (field === 'correctAnswerIndex') {
      updated[index].correctAnswerIndex = value as number;
    } else if (field === 'option' && optionIndex !== undefined) {
      updated[index].options[optionIndex] = value as string;
    }
    setQuestions(updated);
  };

  const handleRemoveQuestion = (index: number) => {
    const updated = questions.filter((_, i) => i !== index);
    setQuestions(updated);
  };

  const parseImportText = () => {
    try {
      const lines = importText.trim().split('\n');
      const newQuestions: Question[] = [];
      
      lines.forEach((line) => {
        // Excel copy-paste is often tab-separated
        const parts = line.split('\t').map(p => p.trim());
        if (parts.length >= 6) {
          const text = parts[0];
          const options = [parts[1], parts[2], parts[3], parts[4]];
          const correctAns = parseInt(parts[5], 10);
          
          if (text && options.every(o => o) && !isNaN(correctAns) && correctAns >= 1 && correctAns <= 4) {
            newQuestions.push({
              id: uuidv4(),
              text,
              options,
              correctAnswerIndex: correctAns - 1, // 0-indexed internally
            });
          }
        }
      });

      if (newQuestions.length > 0) {
        setQuestions(newQuestions);
        setImportText('');
        setShowImport(false);
        alert(`Đã nhập thành công ${newQuestions.length} câu hỏi!`);
      } else {
        alert("Không tìm thấy câu hỏi hợp lệ nào. Vui lòng kiểm tra lại định dạng.");
      }
    } catch (err) {
      alert("Lỗi nội dung nhập vào!");
    }
  };

  const handleCopyTemplate = () => {
    const plainText = "Câu hỏi\tĐáp án 1\tĐáp án 2\tĐáp án 3\tĐáp án 4\tCột đáp án đúng (1-4)\nThủ đô của Việt Nam là gì?\tHà Nội\tHồ Chí Minh\tĐà Nẵng\tHải Phòng\t1\nCon vật nào gáy báo thức vào buổi sáng?\tChó\tMèo\tGà trống\tVịt\t3\n";
    const el = document.createElement('textarea');
    el.value = plainText;
    document.body.appendChild(el);
    el.select();
    try {
      document.execCommand('copy');
      alert("✅ Đã copy bộ khung Câu hỏi! \n\nBây giờ bạn hãy mở một trang Excel trống và ấn 'Ctrl + V' (hoặc chuột phải chọn Paste) để dán bảng mẫu này ra nhé!");
    } catch (e) {
      alert("Trình duyệt không hỗ trợ copy tự động. Vui lòng cài đặt thủ công.");
    }
    document.body.removeChild(el);
  };

  const handleStart = () => {
    if (questions.length === 0) {
      alert("Vui lòng thêm ít nhất 1 câu hỏi!");
      return;
    }
    // Validate
    const invalid = questions.find(q => !q.text.trim() || q.options.some(o => !o.trim()));
    if (invalid) {
      alert("Có câu hỏi hoặc đáp án đang bị bỏ trống. Vui lòng điền đầy đủ!");
      return;
    }
    onStartGame(questions);
  };

  return (
    <div className="min-h-screen bg-blue-50/50 p-8 text-gray-800 font-sans">
      <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-xl overflow-hidden animate-fade-in">
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-8 text-white relative">
          <h1 className="text-3xl font-extrabold flex items-center gap-3">
            🏁 Cấu Hình Game: Nhảy Bao Bố 🏁
          </h1>
          <p className="mt-2 text-blue-100 italic">Cài đặt danh sách câu hỏi cho 2 đội thi đấu song song độc lập.</p>
        </div>

        <div className="p-8 space-y-6">
          {/* Instructions and Fast Import */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-indigo-50 p-4 rounded-xl border border-indigo-100">
            <div className="flex-1">
              <h3 className="font-bold text-indigo-900 flex items-center gap-2">
                <HelpCircle size={18} /> Nhập nhanh từ Excel
              </h3>
              <p className="text-sm text-indigo-700 leading-relaxed mt-1 mb-2">
                Copy dữ liệu từ Excel với 6 cột: <br/>
                <span className="font-mono bg-white px-2 py-0.5 rounded text-indigo-800 font-bold border border-indigo-200 shadow-sm inline-block mt-2 mb-1">
                  Câu hỏi | Đáp án 1 | Đáp án 2 | Đáp án 3 | Đáp án 4 | Cột đáp án đúng (1-4)
                </span>
              </p>
              <button 
                onClick={handleCopyTemplate} 
                className="text-sm flex items-center gap-1.5 text-blue-700 hover:text-blue-900 bg-blue-100 hover:bg-blue-200 px-3 py-1.5 rounded-lg font-bold transition-colors w-fit"
              >
                <Download size={16} /> Copy cấu trúc mẫu dán vào Excel
              </button>
            </div>
            <button
              onClick={() => setShowImport(!showImport)}
              className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg transition-all flex items-center gap-2 whitespace-nowrap"
            >
              <Upload size={20} />
              {showImport ? "Đóng nhập liệu" : "Quét dữ liệu Excel"}
            </button>
          </div>

          {showImport && (
            <div className="bg-yellow-50 p-4 rounded-xl border border-yellow-200 animate-fade-in">
              <textarea
                value={importText}
                onChange={(e) => setImportText(e.target.value)}
                placeholder="Dán (Ctrl+V) dữ liệu được copy từ Excel vào đây..."
                className="w-full h-32 p-3 border border-yellow-300 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:outline-none mb-3 font-mono text-sm"
              />
              <button
                onClick={parseImportText}
                className="px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-white font-bold rounded-lg shadow transition-all"
              >
                Xác nhận nhập
              </button>
            </div>
          )}

          {/* List of Questions */}
          <div className="space-y-4">
            <h2 className="text-xl font-bold flex items-center gap-2 text-gray-800">
              Danh sách câu hỏi ({questions.length})
            </h2>
            
            {questions.map((q, qIndex) => (
              <div key={q.id} className="border border-gray-200 rounded-xl p-5 hover:border-blue-300 transition-colors shadow-sm bg-white group">
                <div className="flex justify-between items-start mb-4 gap-4">
                  <div className="font-bold text-lg text-blue-600 bg-blue-50 w-8 h-8 flex items-center justify-center rounded-full shrink-0">
                    {qIndex + 1}
                  </div>
                  <input
                    type="text"
                    value={q.text}
                    onChange={(e) => handleUpdateQuestion(qIndex, 'text', e.target.value)}
                    placeholder="Nhập nội dung câu hỏi..."
                    className="flex-1 border-b-2 border-gray-100 focus:border-blue-500 bg-transparent py-1 text-lg font-medium outline-none transition-colors"
                  />
                  <button
                    onClick={() => handleRemoveQuestion(qIndex)}
                    className="text-red-400 hover:text-red-600 hover:bg-red-50 p-2 rounded-lg transition-colors"
                    title="Xóa câu hỏi"
                  >
                    <Trash2 size={20} />
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pl-12">
                  {q.options.map((opt, oIndex) => (
                    <div key={oIndex} className="flex items-center gap-3">
                      <input
                        type="radio"
                        name={`correct-${q.id}`}
                        checked={q.correctAnswerIndex === oIndex}
                        onChange={() => handleUpdateQuestion(qIndex, 'correctAnswerIndex', oIndex)}
                        className="w-5 h-5 text-blue-600 focus:ring-blue-500 cursor-pointer"
                      />
                      <input
                        type="text"
                        value={opt}
                        onChange={(e) => handleUpdateQuestion(qIndex, 'option', e.target.value, oIndex)}
                        placeholder={`Đáp án ${oIndex + 1}`}
                        className={`flex-1 border rounded-lg px-3 py-2 outline-none transition-colors ${
                          q.correctAnswerIndex === oIndex 
                            ? 'bg-blue-50 border-blue-300 font-medium' 
                            : 'border-gray-200 focus:border-gray-400'
                        }`}
                      />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-center mt-6 pt-4 border-t border-gray-100">
            <button
              onClick={handleAddQuestion}
              className="flex items-center gap-2 px-6 py-3 border-2 border-dashed border-gray-300 text-gray-600 font-bold rounded-xl hover:border-blue-500 hover:text-blue-600 hover:bg-blue-50 transition-all w-full justify-center"
            >
              <Plus size={20} />
              Thêm câu hỏi mới
            </button>
          </div>
        </div>

        <div className="bg-gray-50 p-6 border-t border-gray-100 flex justify-between items-center gap-4">
          <button
            onClick={onBack}
            className="flex items-center gap-2 px-6 py-3 text-gray-500 hover:text-gray-800 hover:bg-gray-200 font-bold rounded-xl transition-all"
          >
            <HomeIcon size={20} />
            Trở lại trang chủ
          </button>
          
          <button
            onClick={handleStart}
            className="flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-extrabold rounded-full shadow-xl hover:shadow-2xl transition-all transform hover:-translate-y-1 text-lg"
          >
            <Play size={24} fill="currentColor" />
            BẮT ĐẦU CHƠI GAME
          </button>
        </div>
      </div>
    </div>
  );
};
