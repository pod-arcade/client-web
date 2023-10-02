import {Link} from 'react-router-dom';
import Button, {ButtonProps} from '@mui/material/Button';

const LinkButton: React.FC<ButtonProps & {to: string}> = ({...props}) => {
  return <Button component={Link} {...props} />;
};

export default LinkButton;
