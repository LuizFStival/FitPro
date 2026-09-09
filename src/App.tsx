/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import Dashboard from './components/Dashboard';

const localUser = {
  uid: 'luiz-local-training',
  email: 'luiz@local.training',
  displayName: 'Luiz Stival',
  photoURL: '',
};

export default function App() {
  return (
    <div className="mobile-app-shell bg-brand-bg">
      <Dashboard user={localUser} />
    </div>
  );
}

