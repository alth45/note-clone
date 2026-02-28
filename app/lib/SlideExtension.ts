import { Node, mergeAttributes } from '@tiptap/core';

export interface SlideOptions {
    HTMLAttributes: Record<string, any>;
}

declare module '@tiptap/core' {
    interface Commands<ReturnType> {
        slideEmbed: {
            /**
             * Insert a slide/iframe embed
             */
            setSlide: (options: { src: string }) => ReturnType;
        };
    }
}

export const SlideEmbed = Node.create<SlideOptions>({
    name: 'slideEmbed',
    group: 'block',
    atom: true, // Biar elemennya solid (nggak bisa diketik di dalamnya)

    addOptions() {
        return {
            HTMLAttributes: {
                class: 'slide-wrapper relative w-full aspect-video rounded-xl overflow-hidden border border-sumi-10 shadow-sm my-8 bg-washi-dark',
            },
        };
    },

    addAttributes() {
        return {
            src: {
                default: null,
            },
        };
    },

    parseHTML() {
        return [
            {
                tag: 'iframe[data-slide-embed]',
            },
        ];
    },

    renderHTML({ HTMLAttributes }) {
        return [
            'div',
            mergeAttributes(this.options.HTMLAttributes),
            [
                'iframe',
                mergeAttributes(HTMLAttributes, {
                    'data-slide-embed': '',
                    width: '100%',
                    height: '100%',
                    frameborder: '0',
                    allowfullscreen: 'true',
                    class: 'absolute inset-0 w-full h-full',
                }),
            ],
        ];
    },

    addCommands() {
        return {
            setSlide: (options) => ({ commands }) => {
                return commands.insertContent({
                    type: this.name,
                    attrs: options,
                });
            },
        };
    },
});