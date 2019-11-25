const reglConstructor = require('regl');

let reglInstance;

export const getRegl = () => {
  if(reglInstance)
    return reglInstance;
  reglInstance = reglConstructor();
  return reglInstance;
}
