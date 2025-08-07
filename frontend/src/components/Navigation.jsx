import React from 'react'
import { NavLink } from 'react-router-dom'
import { Home, Gamepad2, Wallet, User } from 'lucide-react'

const Navigation = () => {
  const navItems = [
    { to: '/', icon: Home, label: 'Home' },
    { to: '/bingo', icon: Gamepad2, label: 'Games' },
    { to: '/wallet', icon: Wallet, label: 'Wallet' },
    { to: '/profile', icon: User, label: 'Profile' },
  ]

  return (
    <nav className="