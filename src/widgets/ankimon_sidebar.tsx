import { renderWidget } from '@remnote/plugin-sdk';

export const AnkimonSidebar = () => {
  return (
    <div className="p-3 m-2 rounded-lg rn-clr-background-light-positive rn-clr-content-positive">
      <p className="text-base font-medium">Ankimon loaded</p>
    </div>
  );
};

renderWidget(AnkimonSidebar);
