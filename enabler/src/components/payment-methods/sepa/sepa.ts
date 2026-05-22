import {
  ComponentOptions,
  PaymentComponent,
  PaymentComponentBuilder,
  PaymentMethod
} from '../../../payment-enabler/payment-enabler';

import { BaseComponent } from "../../base";

import styles from '../../../style/style.module.scss';
import buttonStyles from "../../../style/button.module.scss";

import {
  PaymentOutcome,
  PaymentRequestSchemaDTO,
} from "../../../dtos/novalnet-payment.dto";

import { BaseOptions } from "../../../payment-enabler/novalnet-payment-enabler";

export class SepaBuilder
  implements PaymentComponentBuilder {

  public componentHasSubmit = true;

  constructor(
    private baseOptions: BaseOptions
  ) {}

  build(
    config: ComponentOptions
  ): PaymentComponent {

    return new Sepa(
      this.baseOptions,
      config
    );
  }
}

export class Sepa extends BaseComponent {

  private showPayButton: boolean;

  constructor(
    baseOptions: BaseOptions,
    componentOptions: ComponentOptions
  ) {

    super(
      PaymentMethod.sepa,
      baseOptions,
      componentOptions
    );

    this.showPayButton =
      componentOptions?.showPayButton ?? false;
  }

  mount(selector: string) {

    const safeSelector =
      selector.replace(/\|/g, '\\|');

    const container =
      document.querySelector(
        safeSelector
      ) as HTMLElement | null;

    if (!container) {

      console.error(
        'Container not found:',
        safeSelector
      );

      return;
    }

    container.insertAdjacentHTML(
      "beforeend",
      this._getTemplate()
    );

    this._loadNovalnetScript();

    if (this.showPayButton) {

      const button =
        document.querySelector(
          "#purchaseOrderForm-paymentButton"
        );

      if (button) {

        button.addEventListener(
          "click",
          async (e) => {

            e.preventDefault();

            await this.submit();
          }
        );
      }
    }
  }

  async submit() {

    this.sdk.init({
      environment: this.environment
    });

    const pathLocale =
      window.location.pathname.split("/")[1];

    const url =
      new URL(window.location.href);

    const baseSiteUrl =
      url.origin;

    try {

      const accountHolder =
        (
          document.getElementById(
            'nn_account_holder'
          ) as HTMLInputElement
        )?.value?.trim();

      const iban =
        (
          document.getElementById(
            'nn_sepa_account_no'
          ) as HTMLInputElement
        )?.value?.trim();

      const bic =
        (
          document.getElementById(
            'nn_sepa_bic'
          ) as HTMLInputElement
        )?.value?.trim();

      if (!accountHolder || !iban) {

        this.onError(
          "Please fill all mandatory fields."
        );

        return;
      }

      const requestData:
        PaymentRequestSchemaDTO = {

        paymentMethod: {

          type:
            "DIRECT_DEBIT_SEPA",

          accHolder:
            accountHolder,

          iban:
            iban,

          bic:
            bic || "",
        },

        paymentOutcome:
          PaymentOutcome.AUTHORIZED,

        lang:
          pathLocale ?? 'de',

        path:
          baseSiteUrl,
      };

      console.log(
        'SEPA REQUEST:',
        requestData
      );

      const response =
        await fetch(
          this.processorUrl +
          "/directPayment",
          {

            method: "POST",

            headers: {

              "Content-Type":
                "application/json",

              "X-Session-Id":
                this.sessionId,
            },

            body: JSON.stringify(
              requestData
            ),
          }
        );

      if (!response.ok) {

        const errorText =
          await response.text();

        console.error(
          'SEPA HTTP ERROR:',
          errorText
        );

        this.onError(
          "Payment request failed."
        );

        return;
      }

      const data =
        await response.json();

      console.log(
        'FULL SEPA RESPONSE:',
        data
      );

      let paymentReference = "";

      if (
        typeof data.paymentReference === "string"
      ) {

        paymentReference =
          data.paymentReference;

      } else if (
        data.paymentReference?.id
      ) {

        paymentReference =
          data.paymentReference.id;
      }

      if (!paymentReference) {

        console.error(
          'PAYMENT REFERENCE MISSING:',
          data
        );

        this.onError(
          "Payment reference missing."
        );

        return;
      }

      console.log(
        'FINAL PAYMENT REFERENCE:',
        paymentReference
      );

      this.onComplete?.({

        isSuccess: true,

        paymentReference:
          paymentReference,
      });

    } catch (e) {

      console.error(
        'SEPA PAYMENT ERROR:',
        e
      );

      this.onError(
        "Ein Fehler ist aufgetreten. Bitte versuchen Sie es erneut."
      );
    }
  }

  private _loadNovalnetScript() {

    if (
      (window as any).NovalnetUtility
    ) {
      return;
    }

    const existingScript =
      document.querySelector(
        'script[src="https://cdn.novalnet.de/js/v2/NovalnetUtility.js"]'
      );

    if (existingScript) {
      return;
    }

    const script =
      document.createElement('script');

    script.src =
      'https://cdn.novalnet.de/js/v2/NovalnetUtility.js';

    script.async = true;

    document.body.appendChild(
      script
    );
  }

  private _getTemplate() {

    const locale =
      document.documentElement.lang || "en";

    return `
      <div class="${styles.wrapper}">

        <form
          id="nn_sepa_form"

          style="
            width:100%;
            display:flex;
            flex-direction:column;
            gap:20px;
          "
        >

          <div>

            <label for="nn_account_holder">
              ${
                locale.startsWith("de")
                  ? "Kontoinhaber"
                  : "Account Holder"
              } *
            </label>

            <input
              type="text"
              id="nn_account_holder"
              name="nn_account_holder"

              style="
                width:100%;
                padding:12px;
                margin-top:6px;
              "
            />

          </div>

          <div>

            <label for="nn_sepa_account_no">
              IBAN *
            </label>

            <input
              type="text"
              id="nn_sepa_account_no"
              name="nn_sepa_account_no"

              autocomplete="off"

              onkeypress="
                return NovalnetUtility.checkIban(
                  event,
                  'bic_div'
                );
              "

              onkeyup="
                return NovalnetUtility.formatIban(
                  event,
                  'bic_div'
                );
              "

              onchange="
                return NovalnetUtility.formatIban(
                  event,
                  'bic_div'
                );
              "

              style="
                width:100%;
                padding:12px;
                margin-top:6px;
                text-transform:uppercase;
              "
            />

          </div>

          <div
            id="bic_div"

            style="
              display:none;
              flex-direction:column;
            "
          >

            <label for="nn_sepa_bic">
              BIC
            </label>

            <input
              type="text"
              id="nn_sepa_bic"
              name="nn_sepa_bic"

              autocomplete="off"

              onkeypress="
                return NovalnetUtility.formatBic(
                  event
                );
              "

              onchange="
                return NovalnetUtility.formatBic(
                  event
                );
              "

              style="
                width:100%;
                padding:12px;
                margin-top:6px;
              "
            />

          </div>

          ${
            this.showPayButton
              ? `
              <button
                class="${buttonStyles.button}
                ${buttonStyles.fullWidth}
                ${styles.submitButton}"

                id="purchaseOrderForm-paymentButton"
              >
                ${
                  locale.startsWith("de")
                    ? "Bezahlen"
                    : "Pay"
                }
              </button>
              `
              : ""
          }

        </form>

      </div>
    `;
  }
}