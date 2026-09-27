// Âm báo bằng Web Audio (không cần file âm thanh).
// Trình duyệt chỉ cho phát âm sau khi người dùng đã bấm gì đó trên trang,
// nên gọi unlockAudio() trong các nút bấm bắt đầu hiệp / bắt đầu nghỉ.
let ctx = null

function getCtx() {
  try {
    const AC = window.AudioContext || window.webkitAudioContext
    if (!AC) return null
    if (!ctx) ctx = new AC()
    if (ctx.state === 'suspended') ctx.resume()
    return ctx
  } catch {
    return null
  }
}

export function unlockAudio() {
  getCtx()
}

export function beep(times = 3) {
  try {
    const c = getCtx()
    if (c) {
      for (let i = 0; i < times; i++) {
        const osc = c.createOscillator()
        const gain = c.createGain()
        osc.frequency.value = 880
        osc.connect(gain)
        gain.connect(c.destination)
        const t0 = c.currentTime + i * 0.25
        gain.gain.setValueAtTime(0.25, t0)
        gain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.18)
        osc.start(t0)
        osc.stop(t0 + 0.2)
      }
    }
    if (navigator.vibrate) navigator.vibrate(200) // rung nhẹ trên điện thoại (nếu hỗ trợ)
  } catch {
    // không phát được âm thì bỏ qua, đồng hồ vẫn chạy bình thường
  }
}