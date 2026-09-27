import useLocalStorage from './useLocalStorage.js'

const DEFAULT_USER = {
  id: 'user-default',
  name: 'Người dùng',
  email: 'user@healthy.app',
  avatar: '🌿',
  joinedDate: new Date().toISOString(),
}

export function useAuth() {
  const [user, setUser] = useLocalStorage('authUser', DEFAULT_USER)
  const [users, setUsers] = useLocalStorage('registeredUsers', [DEFAULT_USER])
  const [isAuthOpen, setIsAuthOpen] = useLocalStorage('authModalOpen', false)

  function login(email, password) {
    const existing = users.find((u) => u.email.toLowerCase() === email.toLowerCase())
    if (existing) {
      setUser(existing)
      return { success: true }
    }
    // Create new if not exists
    const newUser = {
      id: `user-${Date.now()}`,
      name: email.split('@')[0] || 'Người dùng',
      email,
      avatar: '🌿',
      joinedDate: new Date().toISOString(),
    }
    setUsers([...users, newUser])
    setUser(newUser)
    return { success: true }
  }

  function register(name, email, password, avatar = '🌿') {
    const existing = users.find((u) => u.email.toLowerCase() === email.toLowerCase())
    if (existing) {
      return { success: false, message: 'Email này đã được đăng ký tài khoản.' }
    }
    const newUser = {
      id: `user-${Date.now()}`,
      name: name.trim() || 'Người dùng mới',
      email: email.trim(),
      avatar,
      joinedDate: new Date().toISOString(),
    }
    setUsers([...users, newUser])
    setUser(newUser)
    return { success: true }
  }

  function logout() {
    setUser(DEFAULT_USER)
  }

  function switchAccount(userId) {
    const target = users.find((u) => u.id === userId)
    if (target) setUser(target)
  }

  function updateUserName(newName, newAvatar) {
    const updated = { ...user, name: newName || user.name, avatar: newAvatar || user.avatar }
    setUser(updated)
    setUsers(users.map((u) => (u.id === user.id ? updated : u)))
  }

  return {
    user,
    users,
    isAuthOpen,
    setIsAuthOpen,
    login,
    register,
    logout,
    switchAccount,
    updateUserName,
    isGuest: user.id === 'user-default',
  }
}
