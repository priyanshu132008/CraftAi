import React from 'react';
import { AuthSplit } from './AuthSplit';

/** Sign-up entry: the shared split auth page starting in signup mode. */
export const SignupPage: React.FC = () => <AuthSplit initialMode="signup" />;