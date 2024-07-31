// test.js
import { Provider } from 'oidc-provider-package';

const clients = [
  {
    client_id: 'foo',
    client_secret: 'bar',
    grant_types: ['authorization_code'],
    redirect_uris: ['http://localhost:3001/cb'],
  },
];

const configuration = {
  clients,
  features: {
    introspection: { enabled: true }, // enable token introspection
    revocation: { enabled: true }, // enable token revocation
  },
  findAccount: async function (ctx, id) {
    return {
      accountId: id,
      async claims(use, scope) {
        return { sub: id }; // minimal claims object
      },
    };
  },
  interactions: {
    url(ctx, interaction) {
      return `/interaction/${interaction.uid}`;
    },
  },
};

const oidc = new Provider('http://localhost:3000', configuration);

oidc.listen(3000, () => {
  console.log('oidc-provider listening on port 3000, check http://localhost:3000/.well-known/openid-configuration');
});
