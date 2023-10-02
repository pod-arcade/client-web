import {useState} from 'react';

export function useRandomId() {
  const [id] = useState(Math.random().toString(36).substring(9));
  return id;
}
