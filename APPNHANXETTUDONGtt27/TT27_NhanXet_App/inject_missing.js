import fs from 'fs';

async function injectMissing() {
  // We need to inject predefined good comments for missing subjects
  const missingSubjects = {
    DD: {
      T: [
        "Nắm vững các chuẩn mực hành vi đạo đức.",
        "Tích cực tham gia các hoạt động tập thể.",
        "Thể hiện thái độ tôn trọng người lớn, đoàn kết với bạn bè.",
        "Thực hiện tốt các nền nếp, nội quy trường lớp."
      ],
      H: [
        "Bước đầu nhận biết được các hành vi đúng sai.",
        "Có ý thức chấp hành nội quy trường lớp.",
        "Tham gia đầy đủ các hoạt động đạo đức.",
        "Biết phân biệt hành vi nên làm và không nên làm."
      ],
      C: [
        "Cần rèn luyện thêm ý thức tự giác.",
        "Chú ý hơn trong các hoạt động tập thể.",
        "Cần tự giác hơn trong học tập và sinh hoạt."
      ]
    },
    AN: {
      T: [
        "Hát đúng giai điệu và lời ca.",
        "Biết kết hợp gõ đệm và vận động theo nhạc.",
        "Nắm vững kiến thức âm nhạc đã học.",
        "Tự tin biểu diễn bài hát trước lớp."
      ],
      H: [
        "Hát tương đối đúng giai điệu.",
        "Biết gõ đệm cơ bản theo nhịp.",
        "Tham gia hát cùng các bạn trong nhóm.",
        "Thuộc lời ca và hát khá rõ ràng."
      ],
      C: [
        "Cần chú ý lắng nghe nhịp điệu hơn khi hát.",
        "Rèn luyện thêm kĩ năng gõ đệm.",
        "Cần tham gia học hát tích cực hơn."
      ]
    },
    MT: {
      T: [
        "Có khả năng cảm thụ và tạo hình tốt.",
        "Hoàn thành sản phẩm mĩ thuật sáng tạo.",
        "Chú ý quan sát và biết cách phối màu hài hòa.",
        "Vẽ hình cân đối, bố cục đẹp mắt."
      ],
      H: [
        "Hoàn thành sản phẩm mĩ thuật theo yêu cầu cơ bản.",
        "Biết phối màu đơn giản trong tranh vẽ.",
        "Bước đầu biết nhận xét tranh mẫu.",
        "Vẽ được hình mảng theo chủ đề."
      ],
      C: [
        "Cần cố gắng vẽ cân đối hơn.",
        "Chú ý chọn màu sắc phù hợp cho bức tranh.",
        "Cần chăm chút hơn cho sản phẩm mĩ thuật."
      ]
    },
    GDTC: {
      T: [
        "Thực hiện tốt các động tác thể dục.",
        "Tích cực tham gia trò chơi vận động.",
        "Tác phong nhanh nhẹn, hoạt bát.",
        "Phối hợp nhịp nhàng trong đội hình đội ngũ."
      ],
      H: [
        "Thực hiện được các động tác cơ bản.",
        "Có ý thức tham gia trò chơi vận động cùng bạn.",
        "Biết tập hợp hàng ngũ khá nhanh.",
        "Hoàn thành các bài tập theo yêu cầu."
      ],
      C: [
        "Cần chú ý quan sát và tập luyện nhiều hơn.",
        "Cẩn thận hơn khi tham gia trò chơi vận động.",
        "Cần rèn luyện thể lực thêm."
      ]
    },
    TIN: {
      T: [
        "Sử dụng máy tính thành thạo.",
        "Hiểu và thực hành tốt các bài tập thao tác.",
        "Nắm vững kiến thức tin học cơ bản.",
        "Thao tác chuột và bàn phím rất nhanh nhẹn."
      ],
      H: [
        "Bước đầu biết sử dụng chuột và bàn phím.",
        "Thực hành được các bài học cơ bản.",
        "Hoàn thành yêu cầu thực hành trên máy.",
        "Biết cách khởi động và tắt máy tính an toàn."
      ],
      C: [
        "Cần luyện tập thêm kĩ năng thao tác chuột.",
        "Chú ý hơn khi thực hành trên bàn phím.",
        "Cần tập trung thao tác máy tính nhanh hơn."
      ]
    },
    CN: {
      T: [
        "Hoàn thành tốt các sản phẩm thủ công kĩ thuật.",
        "Nắm rõ quy trình và sử dụng đúng dụng cụ vật liệu.",
        "Khéo léo, cẩn thận khi làm sản phẩm.",
        "Có thẩm mỹ và sáng tạo trong tạo hình."
      ],
      H: [
        "Phối hợp hoàn thành được sản phẩm theo yêu cầu.",
        "Bước đầu hiểu quy trình làm việc kĩ thuật.",
        "Thực hiện được các bước gấp, cắt cơ bản.",
        "Hoàn thành sản phẩm đạt mức yêu cầu."
      ],
      C: [
        "Cần rèn luyện thêm tính cẩn thận khi làm sản phẩm.",
        "Cần tỉ mỉ hơn khi cắt dán thủ công.",
        "Chú ý đảm bảo an toàn dụng cụ."
      ]
    }
  };

  const fileStr = fs.readFileSync('extracted_bank_by_grade.json', 'utf8');
  const bankByGrade = JSON.parse(fileStr);

  // Inject to each grade if missing and arrays are empty. 
  // Wait, to be safe, just inject completely for these keys in every grade.
  for (const grade of ['1', '2', '3', '45']) {
    for (const subj of Object.keys(missingSubjects)) {
      if (!bankByGrade[grade][subj]) {
          bankByGrade[grade][subj] = missingSubjects[subj];
      } else {
          // If exist but empty arrays, overwrite
          const s = bankByGrade[grade][subj];
          if ((!s.T || s.T.length === 0) && (!s.H || s.H.length === 0)) {
               bankByGrade[grade][subj] = missingSubjects[subj];
          }
      }
    }
  }

  const jsCode = `/**
 * Kho nhận xét TT27 - Phân loại theo khối lớp
 */

export const BANK_BY_GRADE = ${JSON.stringify(bankByGrade, null, 2)};

export function scoreToLevel(score) {
  if (score >= 9) return 'T';
  if (score >= 6) return 'H';
  return 'C';
}

export function isLevelValue(val) {
  if (!val) return false;
  const s = String(val).trim().toUpperCase();
  return ['T', 'H', 'C', 'ĐIỂM 10', 'ĐIỂM 9', 'ĐIỂM 8', 'ĐIỂM 7', 'ĐIỂM 6', 'ĐIỂM 5', '10', '9', '8', '7', '6', '5', '4', '3', '2', '1', 'A', 'B', 'TỐT', 'HOÀN THÀNH', 'CHƯA HT', 'CHT', 'ĐẠT', 'CẦN CỐ GẮNG'].includes(s);
}

// grade param is expected to be '1', '2', '3', or '45'
export function getComment(subject, level, idx = 0, grade = '45') {
  if (!subject || !level) return '';
  const bank = BANK_BY_GRADE[grade] || BANK_BY_GRADE['45'];
  const opts = bank[subject]?.[level] || BANK_BY_GRADE['45'][subject]?.[level] || [];
  if (opts.length === 0) return '';
  return opts[idx % opts.length];
}

export function getNlpcComment(nlpcType, level, idx = 0, grade = '45') {
  return getComment('NLPC', level, idx, grade);
}
`;

  fs.writeFileSync('src/comment_bank.js', jsCode);
  console.log('Successfully injected missing subjects and rewritten comment_bank.js');
}

injectMissing().catch(console.error);
