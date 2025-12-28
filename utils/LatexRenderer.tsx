import React from 'react';
import katex from 'katex';

interface LatexRendererProps {
    text: string;
    className?: string;
}

/**
 * Component để render text có chứa công thức LaTeX
 * Hỗ trợ:
 * - Inline math: $...$
 * - Display math: $$...$$
 * - Công thức hóa học: \ce{H2O} (cần dùng trong $...$)
 */
const LatexRenderer: React.FC<LatexRendererProps> = ({ text, className }) => {
    // Parse text và tách thành các phần: text thường và công thức LaTeX
    const renderLatex = (input: string): React.ReactNode[] => {
        const parts: React.ReactNode[] = [];

        // Regex để match cả $...$ (inline) và $$...$$ (display)
        // Ưu tiên $$ trước để tránh match nhầm
        const regex = /\$\$([\s\S]*?)\$\$|\$((?:[^$\\]|\\.)+?)\$/g;

        let lastIndex = 0;
        let match;
        let keyIndex = 0;

        while ((match = regex.exec(input)) !== null) {
            // Thêm text trước công thức
            if (match.index > lastIndex) {
                parts.push(
                    <span key={`text-${keyIndex++}`}>
                        {input.slice(lastIndex, match.index)}
                    </span>
                );
            }

            // Xác định loại công thức (display hay inline)
            const isDisplay = match[1] !== undefined;
            const formula = isDisplay ? match[1] : match[2];

            try {
                // Render công thức bằng KaTeX
                const html = katex.renderToString(formula.trim(), {
                    throwOnError: false,
                    displayMode: isDisplay,
                    trust: true,
                    // Hỗ trợ một số macro phổ biến
                    macros: {
                        // Macro cho công thức hóa học đơn giản
                        "\\ce": (args: string) => `\\text{${args}}`,
                    },
                });

                parts.push(
                    <span
                        key={`latex-${keyIndex++}`}
                        className={isDisplay ? 'block my-2 text-center' : 'inline'}
                        dangerouslySetInnerHTML={{ __html: html }}
                    />
                );
            } catch (error) {
                // Nếu có lỗi, hiển thị công thức gốc
                console.error('KaTeX error:', error);
                parts.push(
                    <span key={`error-${keyIndex++}`} className="text-red-500">
                        {isDisplay ? `$$${formula}$$` : `$${formula}$`}
                    </span>
                );
            }

            lastIndex = regex.lastIndex;
        }

        // Thêm phần text còn lại sau công thức cuối cùng
        if (lastIndex < input.length) {
            parts.push(
                <span key={`text-${keyIndex++}`}>
                    {input.slice(lastIndex)}
                </span>
            );
        }

        return parts.length > 0 ? parts : [<span key="empty">{input}</span>];
    };

    return <span className={className}>{renderLatex(text)}</span>;
};

export default LatexRenderer;
