import { PrizeCalculator } from 'bora-frontend';

export function TresConvidados() {
  return (
    <PrizeCalculator
      emailsText={'ana@email.com\nbruno@email.com\ncarla@email.com'}
      collabAmount={50}
    />
  );
}

export function UmConvidado() {
  return (
    <PrizeCalculator
      emailsText={'rafa@email.com'}
      collabAmount={30}
    />
  );
}
