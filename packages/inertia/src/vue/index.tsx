import { defineComponent, h, inject } from 'vue'
import type { DefineSetupFnComponent } from 'vue'
import { Link as InertiaLink } from '@inertiajs/vue3'
import type { InertiaLinkProps } from '@inertiajs/vue3'
import type { RouteName, TuyauClient } from '@tuyau/client'

import type { ValidatedApi, LinkParams } from '../types.js'

export const TUYAU_PLUGIN = 'TUYAU_PLUGIN'

export function getClientKey(key?: string) {
  const suffix = key ? `:${key}` : ''
  return `${TUYAU_PLUGIN}${suffix}`
}

export const TuyauPlugin = {
  install: (app: any, options: { client: { $url: any } }) => {
    app.provide(getClientKey(), options.client)
  },
}

/**
 * We need to do weird things here to make it work. If defining the component the standard way,
 * Typescript will resolve the generic and replace it with a `never` at build time. So
 * kind of unusable.
 */
type LinkComponentType<T extends RouteName<ValidatedApi['routes']>> = DefineSetupFnComponent<
  LinkParams<T> & Omit<InertiaLinkProps, 'href' | 'method'>
>

// @ts-expect-error fine
export const Link: <Route extends RouteName<ValidatedApi['routes']>>(
  props: LinkParams<Route> & Omit<InertiaLinkProps, 'href' | 'method'>,
) => LinkComponentType<Route> = defineComponent(
  (props: { route: string; params?: any }, ctx) => {
    const tuyau = inject<TuyauClient<any, any> | null>(getClientKey())
    if (!tuyau) throw new Error('You must install the TuyauPlugin before using Link')

    const route = tuyau.$route(props.route, props.params)
    const url = tuyau.$url(props.route, { params: props.params })

    return () =>
      h(
        InertiaLink,
        {
          ...props,
          route: undefined,
          params: undefined,
          href: url,
          method: route.method[0],
        },
        ctx.slots,
      )
  },
  { props: ['route', 'params'] },
)
