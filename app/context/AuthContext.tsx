// "use client";

// import { createContext, useContext, useState, ReactNode } from "react";
// import { useRouter } from "next/navigation";

// // Struktur data user kita
// type User = {
//     name: string;
//     handle: string;
//     avatar: string;
//     bio: string;
// };

// type AuthContextType = {
//     user: User | null;
//     login: (userData: User) => void;
//     logout: () => void;
// };

// const AuthContext = createContext<AuthContextType | undefined>(undefined);

// export function AuthProvider({ children }: { children: ReactNode }) {
//     const [user, setUser] = useState<User | null>(null);
//     const router = useRouter();

//     const login = (userData: User) => {
//         setUser(userData);
//         router.push("/dashboard"); // Otomatis lempar ke dashboard habis login
//     };

//     const logout = () => {
//         setUser(null);
//         router.push("/"); // Lempar ke beranda habis logout
//     };

//     return (
//         <AuthContext.Provider value={{ user, login, logout }}>
//             {children}
//         </AuthContext.Provider>
//     );
// }

// // Hook kustom biar gampang dipanggil di komponen lain
// export const useAuth = () => {
//     const context = useContext(AuthContext);
//     if (!context) throw new Error("useAuth harus digunakan di dalam AuthProvider");
//     return context;
// };