import { redirect } from 'next/navigation';

export const metadata = {
  title: 'FromOne | Sign in',
  description: 'Sign in to FromOne to set up your Business Profile and create social posts.',
};

export default function HomePage() {
  redirect('/signin');
}
