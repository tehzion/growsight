export const handleSupabaseError = (error: any): string => {
  console.error('Supabase error:', error);
  
  if (error?.code === '23505') {
    return 'This record already exists.';
  }
  
  if (error?.code === '42501') {
    return 'You do not have permission to perform this action.';
  }
  
  return error?.message || 'An unexpected error occurred';
};