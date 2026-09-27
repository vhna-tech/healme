// Chỉ số thể trạng (Bước 1)

export function calcBMI(weightKg, heightCm) {
  if (!(weightKg >= 20 && weightKg <= 300)) throw new Error('Cân nặng phải từ 20 đến 300 kg');
  if (!(heightCm >= 100 && heightCm <= 250)) throw new Error('Chiều cao phải từ 100 đến 250 cm');
  const bmi = weightKg / (heightCm / 100) ** 2;
  return Math.round(bmi * 10) / 10;
}

// Phân loại theo chuẩn WHO khu vực châu Á - Thái Bình Dương (phù hợp người Việt).
// BMI chỉ là con số tham khảo, không phản ánh tỉ lệ mỡ/cơ.
export function bmiCategory(bmi) {
  if (bmi < 18.5) return 'Thiếu cân';
  if (bmi < 23) return 'Bình thường';
  if (bmi < 25) return 'Thừa cân';
  return 'Béo phì';
}
