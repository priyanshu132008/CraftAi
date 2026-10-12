import React from 'react';
import { AuthSplit } from './AuthSplit';

/** Log-in entry: the shared split auth page starting in login mode. */
export const LoginPage: React.FC = () => <AuthSplit initialMode="login" />;