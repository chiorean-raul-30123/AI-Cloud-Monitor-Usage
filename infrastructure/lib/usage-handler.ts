export async function handler(): Promise<{ statusCode: number; headers: Record<string, string>; body: string }> {
  return {
    statusCode: 200,
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ status: 'placeholder' }),
  };
}
