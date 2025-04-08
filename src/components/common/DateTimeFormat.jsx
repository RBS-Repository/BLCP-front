import { format } from 'date-fns';

const DateTimeFormat = ({ date, formatString = 'MMM dd, yyyy hh:mm a' }) => {
  if (!date) return null;
  
  const formattedDate = date instanceof Date 
    ? format(date, formatString)
    : format(date.toDate(), formatString);

  return <span>{formattedDate}</span>;
};

export default DateTimeFormat; 