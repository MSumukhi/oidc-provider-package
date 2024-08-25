import { Provider } from 'oidc-provider';

const clients = [
  {
    client_id: 'oidcCLIENT',
    client_secret: 'client_super_secret',
    grant_types: ['authorization_code'],
    redirect_uris: ['http://localhost:8080/callback'],  // Ensure this URI matches your client application
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

const oidc = new Provider('http://localhost', configuration);  // Changed port to 80

oidc.listen(80, () => {
  console.log('oidc-provider listening on port 80, check http://localhost/.well-known/openid-configuration');
});
