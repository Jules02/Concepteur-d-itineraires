<?php
/**
 * Created by PhpStorm.
 * User: juloc
 * Date: 22/02/2018
 * Time: 20:51
 */

namespace App\Controller;

use App\Entity\Path;
use Symfony\Bridge\Doctrine\RegistryInterface;
use Symfony\Bundle\FrameworkBundle\Controller\Controller;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Annotation\Route;
use Twig\Environment;

class PagesController extends Controller
{

    /**
     * @Route("/")
     * @param Environment $twig
     * @return Response
     */
    public function index (Environment $twig) {
        return new Response($twig->render('content/welcome.html.twig'));
    }

    /**
     * @Route("/concepteur")
     * @param Environment $twig
     * @return Response
     */
    public function concepteur (Environment $twig) {
        return new Response($twig->render('content/concepteur.html.twig'));
    }

    /**
     * @Route("/apropos")
     * @param Environment $twig
     * @return Response
     */
    public function apropos (RegistryInterface $doctrine) {
        $paths = $doctrine->getRepository(Path::class)->findAll();

        return $this->render('content/apropos.html.twig', compact('paths'));
    }

    /**
     * @Route("/chercher")
     * @param Environment $twig
     * @return Response
     */
    public function chercher (Environment $twig) {
        $em = $this->getDoctrine()->getManager();

        return new Response($twig->render('content/chercher.html.twig'));
    }

    /**
     * @Route("/aide")
     * @param Environment $twig
     * @return Response
     */
    public function aide (Environment $twig) {
        return new Response($twig->render('content/aide.html.twig'));
    }

    /**
     * @Route("/contact")
     * @param Environment $twig
     * @return Response
     */
    public function contact (Environment $twig) {
        return new Response($twig->render('content/contact.html.twig'));
    }

}