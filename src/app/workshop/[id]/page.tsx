import WorkshopClient from './Client';

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ t?: string }>;
}) {
  const { id } = await params;
  const { t: classToken } = await searchParams;
  
  return <WorkshopClient id={id} classToken={classToken} />;
}