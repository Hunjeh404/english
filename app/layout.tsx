import type {Metadata} from 'next';
import './globals.css';
export const metadata:Metadata={title:'English Reading Studio · 영국 영어 듣기',description:'사진으로 담고, 본문을 확인하고, 영국 영어로 한 번씩 듣는 나만의 리딩 스튜디오',icons:{icon:'/favicon.svg'}};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="ko"><body>{children}</body></html>;}
