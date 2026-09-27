import { useState, useEffect, useCallback, useRef } from 'react'

// Giống useState, nhưng tự lưu vào localStorage của trình duyệt.
// Dùng: const [profile, setProfile] = useLocalStorage('profile', null)
// - Gán null để xoá dữ liệu (giá trị quay về initialValue).
// - Nhiều component dùng cùng một khoá sẽ tự đồng bộ với nhau (kể cả giữa các tab).
const EVENT = 'healthy-storage'

function read(key, initialValue) {
  try {
    const raw = window.localStorage.getItem(key)
    return raw !== null ? JSON.parse(raw) : initialValue
  } catch {
    return initialValue
  }
}

export default function useLocalStorage(key, initialValue) {
  const initialRef = useRef(initialValue)
  const [value, setValue] = useState(() => read(key, initialValue))

  useEffect(() => {
    const onSameTab = (e) => {
      if (e.detail === key) setValue(read(key, initialRef.current))
    }
    const onOtherTab = (e) => {
      if (e.key === key || e.key === null) setValue(read(key, initialRef.current))
    }
    window.addEventListener(EVENT, onSameTab)
    window.addEventListener('storage', onOtherTab)
    return () => {
      window.removeEventListener(EVENT, onSameTab)
      window.removeEventListener('storage', onOtherTab)
    }
  }, [key])

  const set = useCallback(
    (next) => {
      const remove = next === null || next === undefined
      let ok = true
      try {
        if (remove) window.localStorage.removeItem(key)
        else window.localStorage.setItem(key, JSON.stringify(next))
      } catch {
        ok = false // localStorage bị chặn hoặc đầy: dữ liệu chỉ tồn tại trong phiên này
      }
      setValue(remove ? initialRef.current : next)
      if (ok) window.dispatchEvent(new CustomEvent(EVENT, { detail: key }))
    },
    [key],
  )

  return [value, set]
}