import {it,expect} from 'vitest';
import {renderToStaticMarkup} from 'react-dom/server';
import {StatusScreen} from './StatusScreen';
import {chooseStarter,createInitialStateV4} from '../../game/state/store';
it('renders trainer identity and milestone for a real starter save without a blank-screen crash',()=>{
 const state=chooseStarter(createInitialStateV4(),656);
 const html=renderToStaticMarkup(<StatusScreen rootURL="/" state={state} active={state.party[0]}/>);
 expect(html).toContain('Your adventure');
 expect(html).toContain('Froakie');
 expect(html).toContain('Untested');
});
